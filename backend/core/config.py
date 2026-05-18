from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AgentsTrading Backend"
    
    # We use SQLite for local prototyping. Later you can switch to:
    # "postgresql+asyncpg://user:password@localhost/dbname"
    DATABASE_URL: str = "sqlite+aiosqlite:///./trading.db"
    
    # LLM Settings (Gemini)
    GOOGLE_API_KEY: str = "AIzaSyA8Nb2_wcv-R1SWBnIoQjwcjK2X4irGSew"
    
    class Config:
        env_file = ".env"

settings = Settings()
