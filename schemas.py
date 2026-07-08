from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from BaseD import EstadoObjetivo

# Esquema base con lo que necesitamos para un objetivo
class ObjetivoBase(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    fecha_objetivo: date
    estado: EstadoObjetivo = EstadoObjetivo.PENDIENTE
    usuario_id: Optional[str] = None  # --- NUEVA LÍNEA AGREGADA ---

# Esquema para crear (hereda de la base)
class ObjetivoCreate(ObjetivoBase):
    pass

# Esquema para responder (incluye el ID y la fecha de creación que genera la BD)
class ObjetivoResponse(ObjetivoBase):
    id: int
    fecha_creacion: datetime

    class Config:
        from_attributes = True


class Recomendacion(BaseModel):
    id: int
    texto: str

    class Config:
        from_attributes = True