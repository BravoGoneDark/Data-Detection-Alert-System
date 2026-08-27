# app/storage.py

import os
from abc import ABC, abstractmethod
from pathlib import Path


class StorageProvider(ABC):
    """Abstract base interface for file storage engines (Local CAS, S3/MinIO, etc.)."""

    @abstractmethod
    def save_file(self, sha256: str, file_bytes: bytes) -> str:
        """
        Saves file bytes to storage keyed by its SHA-256 hash.
        Returns the relative storage path or key.
        If the file already exists (identical content), avoids redundant writes.
        """
        pass

    @abstractmethod
    def get_file_path(self, storage_path: str) -> str:
        """Returns the absolute filesystem path for local storage or local cached path."""
        pass

    @abstractmethod
    def file_exists(self, storage_path: str) -> bool:
        """Checks if the file exists in storage."""
        pass

    @abstractmethod
    def read_file(self, storage_path: str) -> bytes:
        """Reads and returns the raw file bytes."""
        pass


class LocalContentAddressableStorage(StorageProvider):
    """
    Content-Addressable Storage (CAS) provider on the local filesystem.
    Files are stored sharded by the first 4 characters of their SHA-256 hash:
      storage/cas/{hash[0:2]}/{hash[2:4]}/{hash}
    Exact duplicate uploads share the exact same physical file on disk (single-instance storage).
    """

    def __init__(self, base_dir: str | None = None):
        if base_dir is None:
            # Check for persistent disk mount environment variable or default to local backend/storage/cas
            env_path = os.getenv("CAS_STORAGE_PATH")
            if env_path:
                base_dir = env_path
            else:
                base_dir = os.path.join(
                    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    "storage",
                    "cas",
                )
        self.base_dir = os.path.abspath(base_dir)
        os.makedirs(self.base_dir, exist_ok=True)

    def _get_relative_path(self, sha256: str) -> str:
        shard1 = sha256[:2]
        shard2 = sha256[2:4]
        return os.path.join(shard1, shard2, sha256)

    def save_file(self, sha256: str, file_bytes: bytes) -> str:
        rel_path = self._get_relative_path(sha256)
        full_path = os.path.join(self.base_dir, rel_path)

        if not os.path.exists(full_path):
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            # Write bytes atomically
            temp_path = f"{full_path}.tmp"
            with open(temp_path, "wb") as f:
                f.write(file_bytes)
            os.replace(temp_path, full_path)

        return rel_path.replace("\\", "/")

    def get_file_path(self, storage_path: str) -> str:
        # Normalize slashes for OS
        normalized = os.path.normpath(storage_path)
        return os.path.join(self.base_dir, normalized)

    def file_exists(self, storage_path: str) -> bool:
        full_path = self.get_file_path(storage_path)
        return os.path.exists(full_path)

    def read_file(self, storage_path: str) -> bytes:
        full_path = self.get_file_path(storage_path)
        with open(full_path, "rb") as f:
            return f.read()


# Singleton instance
_storage_instance: StorageProvider | None = None


def get_storage() -> StorageProvider:
    """Returns the active storage provider singleton."""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = LocalContentAddressableStorage()
    return _storage_instance
