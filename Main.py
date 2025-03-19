from datetime import datetime
import json
from contextlib import asynccontextmanager

import httpx
import openai
from fastapi import FastAPI, WebSocket, HTTPException, Depends
from fastapi.templating import Jinja2Templates
from fastapi.responses import StreamingResponse
from httpx import Response
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request
import asyncio
from starlette.staticfiles import StaticFiles
import logging
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocketDisconnect

# Enable logging to check execution
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
DATABASE_URL = "mysql+aiomysql://root:Saida%40143@localhost/genix"
engine = create_async_engine(DATABASE_URL, echo = True)
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

# Predefined system prompt for returning exact HTML
SYSTEM_PROMPT = (
    "You will be provided with an HTML string. Your task is to return the exact same HTML string without any "
    "modifications or changes. Do not analyze, format, or alter the content in any way. Simply return the given "
    "input exactly as it is."
)
OPENAI_API_KEY = ""
openai.api_key = OPENAI_API_KEY
# Background task to check for new rows
# Use FastAPI's new lifespan event
@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info("FastAPI is starting... Creating background task...")
    task = asyncio.create_task(check_for_new_data())  # Start background task
    yield  # Allow app to run
    logging.info("FastAPI is shutting down... Cancelling background task...")
    task.cancel()  # Stop background task when app shuts down

app = FastAPI(lifespan=lifespan)
# Serve static files (Frontend)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

active_connections = set()  # Store active WebSocket connections
search_connections = set()

# Add CORSMiddleware to the apps
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Can be ["*"] for all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (POST, GET, OPTIONS, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Pydantic model for request validation
class ErrorCreate(BaseModel):
    source: str
    error_description: str
    response: str
    search_keyword: str

# Dependency to get DB session
async def get_db():
    async with SessionLocal() as session:
        yield session


@app.get("/")
async def get_home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    logging.info("WebSocket request received!")  # Log incoming request
    await websocket.accept()
    active_connections.add(websocket)
    logging.info("WebSocket client connected.")

    try:
        while True:
            data = await websocket.receive_text()
            logging.info(f"Received: {data}")
            await websocket.send_text(f" Message received: {data}")
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        logging.info(" WebSocket client disconnected.")

# Websocket connection two
@app.websocket("/ws/search")
async def websocket_search(websocket: WebSocket):
    await websocket.accept()
    search_connections.add(websocket)
    logging.info(" WebSocket (Search) connected.")

    try:
        while True:
            keyword = await websocket.receive_text()  #  Receive search query
            logging.info(f"Searching for keyword: {keyword}")

            # Fetch data matching the keyword
            matching_data = await search_errors(keyword)

            # Send results to UI via WebSocket
            response = json.dumps(matching_data)
            await websocket.send_text(response)
            logging.info("Search results sent to UI.")

    except WebSocketDisconnect:
        search_connections.remove(websocket)
        logging.info("WebSocket (Search) disconnected.")

# fetching rows with data based on user input keywords
async def search_errors(keyword: str):
    """Fetch rows where `error_msg` contains the keyword."""
    try:
        async with SessionLocal() as session:
            query = text("SELECT * FROM error_response WHERE search_keyword LIKE :keyword order by id desc limit 1")
            result = await session.execute(query, {"keyword": f"%{keyword}%"})
            rows = result.fetchall()

            if not rows:
                return {"status": "success", "message": "No matching records found.", "results": []}

            # Convert result into dictionary format
            column_names = result.keys()
            formatted_rows = [
                {key: (value.isoformat() if isinstance(value, datetime) else value)
                 for key, value in zip(column_names, row)}
                for row in rows
            ]

            return {"status": "success", "results": formatted_rows}

    except Exception as e:
        logging.error(f"Error fetching data: {e}")
        return {"status": "error", "message": str(e)}


@app.get("/test-db-connection")
def test_database_connection():
    try:
        # Create a session
        session = SessionLocal()

        # Test query to fetch data from error_log table
        query = text("SELECT * FROM error_response LIMIT 5")

        # Execute the query
        result = session.execute(query)

        # Fetch all rows
        rows = result.fetchall()

        # Get column names
        column_names = result.keys()

        # Convert rows to list of dictionaries
        formatted_rows = []
        for row in rows:
            # Convert each row to a dictionary
            row_dict = dict(zip(column_names, row))
            # Convert any non-serializable types to strings
            for key, value in row_dict.items():
                row_dict[key] = str(value)
            formatted_rows.append(row_dict)

        # Close the session
        session.close()

        return {
            "status": "success",
            "message": "Database connection successful!",
            "columns": list(column_names),
            "rows": formatted_rows
        }

    except SQLAlchemyError as e:
        # Raise HTTP exception with error details
        raise HTTPException(status_code=500, detail=str(e))


async def check_for_new_data():
    """Continuously checks for new rows and sends them to the WebSocket."""

    # Step 1: Get the last row's ID at startup
    async with SessionLocal() as session:
        result = await session.execute(text("SELECT id FROM error_response ORDER BY id DESC LIMIT 1"))
        last_row = result.scalar()
        last_id = last_row if last_row else 0  # Use last row ID, or 0 if table is empty

    logging.info(f"Starting from last known row ID: {last_id}")

    while True:
        logging.info("Checking for new data...")  # Log execution
        try:
            async with SessionLocal() as session:
                # Fetch all rows with ID greater than last_id
                result = await session.execute(
                    text("SELECT id FROM error_response WHERE id > :last_id ORDER BY id ASC"), {"last_id": last_id})
                new_rows = result.scalars().all()  # Get all new row IDs

                if new_rows:
                    logging.info(f"New rows detected: {new_rows}")

                    for row_id in new_rows:
                        row_data = await fetch_data_by_id(session, row_id)
                        if row_data:
                            await notify_clients(row_data)
                            await asyncio.sleep(3)

                    # Update last processed ID to the highest new ID
                    last_id = new_rows[-1]

                else:
                    logging.info("No new rows found.")

        except Exception as e:
            logging.error(f"Error checking database: {e}")

        await asyncio.sleep(10)  # Check every 10 seconds


async def fetch_data_by_id(session, row_id):
    """Fetch complete row data based on ID."""
    try:
        query = text("SELECT * FROM error_response WHERE id = :id")
        result = await session.execute(query, {"id": row_id})
        row = result.fetchone()

        if row:
            column_names = result.keys()
            row_dict = dict(zip(column_names, row))
            # Convert datetime objects to strings
            for key, value in row_dict.items():
                if isinstance(value, datetime):
                    row_dict[key] = value.isoformat()  # Convert datetime to "YYYY-MM-DDTHH:MM:SS"
            return row_dict
        return None
    except Exception as e:
        logging.error(f"Error fetching data by ID: {e}")
        return None

async def notify_clients(data):
    """Send data to all connected WebSocket clients."""
    if data:
        message = json.dumps(data)
        logging.info(f"Sending update to {len(active_connections)} clients: {message}")
        for connection in active_connections:
            try:
                await connection.send_text(message)
                logging.info("Data sent to UI via WebSocket.")
            except Exception as e:
                logging.error(f"Error sending WebSocket message: {e}")


# Stream AI-like text response
async def generate_html_stream(content: str):
    """Stream HTML content dynamically"""
    for chunk in content.split():  # Stream word by word
        yield chunk + " "
        await asyncio.sleep(0.1)  # Simulate typing effect

@app.get("/stream")
async def stream_html(message: str):
    """Endpoint that streams the provided message"""
    return StreamingResponse(generate_html_stream(message), media_type="text/html")

# Function to get the exact same HTML as response
async def generate_html_response(logs: str) -> str:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": logs}
    ]

    # Call OpenAI API
    response = openai.ChatCompletion.create(
        model="gpt-4-turbo",
        messages=messages,
        temperature=0.0,  # Ensure no creativity
    )

    # Return the exact HTML response
    return response.choices[0].message["content"].strip()

@app.post("/insert-error/")
async def insert_error(error_data: ErrorCreate, db: AsyncSession = Depends(get_db)):
    """Insert an error log into the error_response table."""
    try:
        llm_response = await generate_html_response(error_data.response)
        query = text("""
            INSERT INTO error_response (source, error_description, response, search_keyword)
            VALUES (:source, :error_description, :response, :search_keyword)
        """)
        await db.execute(query, {
            "source": error_data.source,
            "error_description": error_data.error_description,
            "response": llm_response,
            "search_keyword": error_data.search_keyword
        })

        await db.commit()
        return {"message": "Error inserted successfully with llm response", "response": llm_response}

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

