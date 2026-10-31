import hashlib
import uuid
from functools import lru_cache

from fastembed import TextEmbedding
from qdrant_client import QdrantClient, models

from config import require_env

COLLECTION = "resumes"
EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
EMBEDDING_SIZE = 384
CHUNK_SIZE = 800
CHUNK_OVERLAP = 100


def resume_id_for(data: bytes) -> str:
    # Derived from the file so that re-uploading a resume overwrites its chunks instead of duplicating them
    return str(uuid.uuid5(uuid.NAMESPACE_OID, hashlib.sha256(data).hexdigest()))


def chunk_text(text: str) -> list[str]:
    step = CHUNK_SIZE - CHUNK_OVERLAP
    return [text[i : i + CHUNK_SIZE] for i in range(0, max(len(text) - CHUNK_OVERLAP, 1), step)]


@lru_cache
def get_embedder() -> TextEmbedding:
    # Loaded on first use: the model is downloaded once, then read from the local cache
    return TextEmbedding(model_name=EMBEDDING_MODEL)


@lru_cache
def get_client() -> QdrantClient:
    client = QdrantClient(url=require_env("QDRANT_URL"), api_key=require_env("QDRANT_API_KEY"))
    if not client.collection_exists(COLLECTION):
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=models.VectorParams(size=EMBEDDING_SIZE, distance=models.Distance.COSINE),
        )
        # Qdrant Cloud can reject filtered searches on fields without a payload index
        client.create_payload_index(
            collection_name=COLLECTION,
            field_name="resume_id",
            field_schema=models.PayloadSchemaType.KEYWORD,
        )
    return client


def _resume_filter(resume_id: str) -> models.Filter:
    return models.Filter(
        must=[models.FieldCondition(key="resume_id", match=models.MatchValue(value=resume_id))]
    )


def store_resume(resume_id: str, text: str) -> None:
    chunks = chunk_text(text)
    vectors = get_embedder().passage_embed(chunks)
    points = [
        models.PointStruct(
            id=str(uuid.uuid5(uuid.UUID(resume_id), str(index))),
            vector=vector.tolist(),
            payload={"resume_id": resume_id, "chunk_index": index, "text": chunk},
        )
        for index, (chunk, vector) in enumerate(zip(chunks, vectors))
    ]
    get_client().upsert(collection_name=COLLECTION, points=points, wait=True)


def search_resume(resume_id: str, question: str, limit: int = 5) -> list[str]:
    vector = next(iter(get_embedder().query_embed(question)))
    result = get_client().query_points(
        collection_name=COLLECTION,
        query=vector.tolist(),
        query_filter=_resume_filter(resume_id),
        limit=limit,
    )
    return [point.payload["text"] for point in result.points]
