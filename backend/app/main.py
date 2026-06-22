from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Buildable Land Analyzer API",
    description="Backend service for analyzing buildable land suitability using GeoPandas and Shapely.",
    version="0.1.0"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Buildable Land Analyzer API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
