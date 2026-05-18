from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AgentsTrading Backend"
    
    # We use SQLite for local prototyping. Later you can switch to:
    # "postgresql+asyncpg://user:password@localhost/dbname"
    DATABASE_URL: str = "sqlite+aiosqlite:///./trading.db"
    
    # LLM Settings (Gemini)
    GOOGLE_API_KEY: str = "[GCP_API_KEY]"
    
    class Config:
        env_file = ".env"

settings = Settings()
