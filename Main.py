from datetime import datetime
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.responses import StreamingResponse
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request
import asyncio
from starlette.staticfiles import StaticFiles
import logging

from starlette.websockets import WebSocketDisconnect

# Enable logging to check execution
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
DATABASE_URL = "mysql+aiomysql://root:Saida%40143@localhost/genix"
engine = create_async_engine(DATABASE_URL, echo = True)
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

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

@app.get("/")
async def get_home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    logging.info("🟡 WebSocket request received!")  # Log incoming request
    await websocket.accept()
    active_connections.add(websocket)
    logging.info("✅ WebSocket client connected.")

    try:
        while True:
            data = await websocket.receive_text()
            logging.info(f"📩 Received: {data}")
            await websocket.send_text(f"📝 Message received: {data}")
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        logging.info("❌ WebSocket client disconnected.")
# @app.websocket("/ws")
# async def websocket_endpoint(websocket: WebSocket):
#     """Handle WebSocket connections."""
#     await websocket.accept()
#     active_connections.add(websocket)
#     logging.info("🔌 WebSocket client connected.")
#
#     try:
#         while True:
#             await websocket.receive_text()  # Keep connection open
#     except WebSocketDisconnect:
#         active_connections.remove(websocket)
#         logging.info("❌ WebSocket client disconnected.")


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

# async def check_for_new_data():
#     last_id = 0  # Track the last processed row ID
#     while True:
#         logging.info("Checking for new data...")  # Log execution
#         try:
#             async with SessionLocal() as session:
#                 result = await session.execute(text("SELECT id FROM error_response ORDER BY id DESC LIMIT 1"))
#                 latest_row = result.scalar()
#
#                 if latest_row > last_id:
#                     logging.info(f"Latest row ID fetched: {latest_row}")
#                     # ✅ Fetch complete data by ID
#                     row_data = await fetch_data_by_id(session, latest_row)
#
#                     # ✅ Send row data to WebSocket clients
#                     logging.info(row_data)
#                     await notify_clients(row_data)
#
#                 else:
#                     logging.info("No rows found in database.")
#
#                 if latest_row and latest_row > last_id:
#                     last_id = latest_row
#                     logging.info(f"New row detected: ID {latest_row}")
#
#         except Exception as e:
#             logging.error(f"Error checking database: {e}")
#
#         await asyncio.sleep(3)


async def check_for_new_data():
    """Continuously checks for new rows and sends them to the WebSocket."""

    # ✅ Step 1: Get the last row's ID at startup
    async with SessionLocal() as session:
        result = await session.execute(text("SELECT id FROM error_response ORDER BY id DESC LIMIT 1"))
        last_row = result.scalar()
        last_id = last_row if last_row else 0  # Use last row ID, or 0 if table is empty

    logging.info(f"🔄 Starting from last known row ID: {last_id}")

    while True:
        logging.info("🔄 Checking for new data...")  # Log execution
        try:
            async with SessionLocal() as session:
                # Fetch all rows with ID greater than last_id
                result = await session.execute(
                    text("SELECT id FROM error_response WHERE id > :last_id ORDER BY id ASC"), {"last_id": last_id})
                new_rows = result.scalars().all()  # Get all new row IDs

                if new_rows:
                    logging.info(f"🆕 New rows detected: {new_rows}")

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
            logging.error(f"❌ Error checking database: {e}")

        await asyncio.sleep(10)  # Check every 10 seconds


async def fetch_data_by_id(session, row_id):
    """🔍 Fetch complete row data based on ID."""
    try:
        query = text("SELECT * FROM error_response WHERE id = :id")
        result = await session.execute(query, {"id": row_id})
        row = result.fetchone()

        if row:
            column_names = result.keys()
            row_dict = dict(zip(column_names, row))
            # ✅ Convert datetime objects to strings
            for key, value in row_dict.items():
                if isinstance(value, datetime):
                    row_dict[key] = value.isoformat()  # Convert datetime to "YYYY-MM-DDTHH:MM:SS"
            return row_dict
        return None
    except Exception as e:
        logging.error(f"❌ Error fetching data by ID: {e}")
        return None

async def notify_clients(data):
    """📡 Send data to all connected WebSocket clients."""
    if data:
        message = json.dumps(data)
        logging.info(f"📨 Sending update to {len(active_connections)} clients: {message}")
        for connection in active_connections:
            try:
                await connection.send_text(message)
                logging.info("✅ Data sent to UI via WebSocket.")
            except Exception as e:
                logging.error(f"❌ Error sending WebSocket message: {e}")

# # Keep track of the last processed row ID
# last_id = 0
#
# async def check_for_new_data():
#     global last_id
#     async with SessionLocal() as session:
#         while True:
#             try:
#                 # Fetch the latest row where id > last_id
#                 result = await session.execute(text(f"SELECT * FROM error_response WHERE id > {last_id} ORDER BY id ASC"))
#                 new_rows = result.fetchall()
#
#                 if new_rows:
#                     for row in new_rows:
#                         last_id = row[0]  # Assuming 'id' is the first column
#                         await notify_clients(f"New row inserted: {dict(row)}")
#                         logging.info(f"New row detected: {dict(row)}")
#
#                 await asyncio.sleep(3)  # Poll every 3 seconds
#
#             except Exception as e:
#                 logging.error(f"Error checking database: {e}")

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