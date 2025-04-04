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
    REG_NAME: str = os.getenv("AWS_DEFAULT_REGION")
    AWS_SPLUNK_ENDPOINT: str = os.getenv("AWS_SPLUNK_ENDPOINT")
    BASIC_AUTH_USERNAME: str = os.getenv("BASIC_AUTH_USERNAME")
    BASIC_AUTH_PASSWORD: str = os.getenv("BASIC_AUTH_PASSWORD")


# Instantiate settings
settings = Settings()
