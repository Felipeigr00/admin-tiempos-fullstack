from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text # Importante para actualizar la base de datos
from database import engine, SessionLocal
import BaseD
import schemas
import random

BaseD.Base.metadata.create_all(bind=engine)

app = FastAPI(title="API de Administrador de Tiempos")

# Configuramos CORS para permitir que Next.js se conecte
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def leer_raiz():
    return {"mensaje": "¡El servidor de FastAPI está funcionando y la base de datos está conectada!"}

# 1. Crear un nuevo objetivo (POST)
@app.post("/objetivos/", response_model=schemas.ObjetivoResponse)
def crear_objetivo(objetivo: schemas.ObjetivoCreate, db: Session = Depends(get_db)):
    if not objetivo.usuario_id:
        raise HTTPException(status_code=400, detail="usuario_id es requerido para crear un objetivo")
    nuevo_objetivo = BaseD.Objetivo(**objetivo.model_dump())
    db.add(nuevo_objetivo)
    db.commit()
    db.refresh(nuevo_objetivo)
    return nuevo_objetivo

# 2. Obtener todos los objetivos (GET)
@app.get("/objetivos/", response_model=list[schemas.ObjetivoResponse])
def leer_objetivos(db: Session = Depends(get_db)):
    objetivos = db.query(BaseD.Objetivo).all()
    return objetivos

# --- NUEVO ENDPOINT PARA MULTIUSUARIO ---
# 2.5 Obtener objetivos de un solo usuario (GET)
@app.get("/objetivos/usuario/{usuario_id}", response_model=list[schemas.ObjetivoResponse])
def leer_objetivos_usuario(usuario_id: str, db: Session = Depends(get_db)):
    # Filtramos para traer solo las tareas que le pertenecen a este usuario
    objetivos = db.query(BaseD.Objetivo).filter(BaseD.Objetivo.usuario_id == usuario_id).all()
    return objetivos

# 3. Actualizar un objetivo (PUT)
@app.put("/objetivos/{objetivo_id}", response_model=schemas.ObjetivoResponse)
def actualizar_objetivo(objetivo_id: int, objetivo_actualizado: schemas.ObjetivoCreate, db: Session = Depends(get_db)):
    objetivo = db.query(BaseD.Objetivo).filter(BaseD.Objetivo.id == objetivo_id).first()
    
    if objetivo is None:
        raise HTTPException(status_code=404, detail="Objetivo no encontrado")
    
    objetivo.titulo = objetivo_actualizado.titulo
    objetivo.descripcion = objetivo_actualizado.descripcion
    objetivo.fecha_objetivo = objetivo_actualizado.fecha_objetivo
    objetivo.estado = objetivo_actualizado.estado
    
    # Nos aseguramos de mantener el ID del usuario si ya existía
    if objetivo_actualizado.usuario_id:
        objetivo.usuario_id = objetivo_actualizado.usuario_id
    
    db.commit()
    db.refresh(objetivo)
    return objetivo

# 4. Eliminar un objetivo (DELETE)
@app.delete("/objetivos/{objetivo_id}")
def eliminar_objetivo(objetivo_id: int, db: Session = Depends(get_db)):
    objetivo = db.query(BaseD.Objetivo).filter(BaseD.Objetivo.id == objetivo_id).first()
    
    if objetivo is None:
        raise HTTPException(status_code=404, detail="Objetivo no encontrado")
    
    db.delete(objetivo)
    db.commit()
    return {"mensaje": "Objetivo eliminado exitosamente"}

# 5. Inyección de datos y migración al iniciar el servidor
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    
    # TRUCO DE MIGRACIÓN: Intentamos agregar la columna nueva a Neon automáticamente
    try:
        db.execute(text("ALTER TABLE objetivos ADD COLUMN usuario_id VARCHAR;"))
        db.commit()
        print("Columna usuario_id agregada exitosamente a la base de datos.")
    except Exception:
        # Si falla (porque la columna ya existe), deshacemos el error silenciosamente
        db.rollback() 
        
    # Revisamos si la tabla de recomendaciones está vacía
    if db.query(BaseD.Recomendacion).count() == 0:
        frases = [
            "Toma 15 minutos de sol hoy ☀️",
            "Revisa tu postura en la silla 🪑",
            "Bebe un vaso de agua ahora mismo 💧",
            "Lee un artículo técnico sobre un tema nuevo 📖",
            "Haz una pausa de 5 minutos lejos de la pantalla 🚫💻",
            "Organiza tu escritorio para mayor claridad mental 🧹"
        ]
        for frase in frases:
            nueva_rec = BaseD.Recomendacion(texto=frase)
            db.add(nueva_rec)
        db.commit()
    db.close()

# 6. El nuevo endpoint para pedir UNA recomendación al azar
@app.get("/recomendacion-del-dia/", response_model=schemas.Recomendacion)
def leer_recomendacion(db: Session = Depends(get_db)):
    recomendaciones = db.query(BaseD.Recomendacion).all()
    if not recomendaciones:
        raise HTTPException(status_code=404, detail="No hay recomendaciones en la base de datos")
    
    return random.choice(recomendaciones)