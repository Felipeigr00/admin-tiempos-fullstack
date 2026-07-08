from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# URL de conexión para PostgreSQL en Neon
SQLALCHEMY_DATABASE_URL = "postgresql://neondb_owner:npg_V7rFZhe3mgEn@ep-purple-poetry-atlxdced.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Motor limpio, sin configuraciones de SQLite
engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# AQUÍ está la variable Base que tu otro archivo necesita
Base = declarative_base()