from sqlalchemy import Column, Integer, String, Date, DateTime, Enum
from database import Base 
import datetime
import enum

class EstadoObjetivo(str, enum.Enum):
    PENDIENTE = "Pendiente"
    EN_PROGRESO = "En Progreso"
    COMPLETADO = "Completado"
    ARCHIVADO = "Archivado" # Agregué el estado que definimos antes

class Objetivo(Base):
    __tablename__ = "objetivos"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(100), nullable=False)
    descripcion = Column(String(255), nullable=True)
    fecha_objetivo = Column(Date, nullable=False)
    estado = Column(Enum(EstadoObjetivo), default=EstadoObjetivo.PENDIENTE, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
    
    # --- NUEVA COLUMNA ---
    usuario_id = Column(String, index=True, nullable=True)

class Recomendacion(Base):
    __tablename__ = "recomendaciones"

    id = Column(Integer, primary_key=True, index=True)
    texto = Column(String, index=True)