# config.py
# from pydantic import BaseSettings
from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

class Settings(BaseSettings):
    POLL_THRESSHOLD: int = 5
    API_KEY: str = os.getenv("API_KEY")

# Instantiate settings
settings = Settings()
