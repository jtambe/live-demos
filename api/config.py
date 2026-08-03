from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Application settings from environment variables"""

    supabase_url: str
    supabase_service_role_key: str
    api_environment: str = "development"

    class Config:
        env_file = ".env.local"
        extra = "ignore"

    @property
    def is_production(self) -> bool:
        return self.api_environment == "production"

settings = Settings()
