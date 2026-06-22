from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Buildable Land Analyzer"
    API_V1_STR: str = "/api/v1"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
