import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# The engine manages the actual connection pool to Postgres.
engine = create_engine(DATABASE_URL)

# Each request gets its own Session — think of it as a "conversation"
# with the database: track changes, then commit or rollback as a unit.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class that all our table models will inherit from.
Base = declarative_base()


def get_db():
    """
    Dependency for FastAPI routes. Yields a session, ensures it's
    closed after the request finishes even if an error occurs.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()