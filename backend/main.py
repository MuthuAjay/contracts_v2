from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json
import os
from analyze import perform_analysis as analyze_func
from process_document import process_document as process_func

app = FastAPI()

# Configure CORS - Updated settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=False,  # Changed to False since we don't need credentials
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Request/Response Models
class AnalysisRequest(BaseModel):
    content: str
    type: str
    collection_name: Optional[str] = None
    custom_query: Optional[str] = None

class AnalysisResponse(BaseModel):
    content: str
    collection_name: str

class ErrorResponse(BaseModel):
    detail: str

# File size limit (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

# Allowed file types
ALLOWED_FILE_TYPES = {
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

async def save_upload_file(file: UploadFile) -> str:
    """Save uploaded file and return the file path."""
    # Check file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File size exceeds the 10MB limit"
        )
    
    # Check file type
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type. Allowed types: {', '.join(ALLOWED_FILE_TYPES.keys())}"
        )

    temp_path = f"temp_{file.filename}"
    try:
        with open(temp_path, "wb") as buffer:
            buffer.write(contents)
        return temp_path
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save uploaded file: {str(e)}"
        )

@app.post("/api/upload", response_model=AnalysisResponse)
async def upload_file(file: UploadFile = File(...)):
    temp_path = None
    try:
        # Save and validate file
        temp_path = await save_upload_file(file)
        
        # Process document
        content, collection_name = process_func(temp_path)
        
        # Return response
        return AnalysisResponse(
            content=content,
            collection_name=collection_name
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Document processing failed: {str(e)}"
        )
    finally:
        # Clean up temporary file
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/api/analyze")
async def analyze_document(request: AnalysisRequest) -> Dict[str, Any]:
    try:
        # Convert request to dictionary for the analysis function
        analysis_params = {
            "content": request.content,
            "type": request.type,
            "collection_name": request.collection_name,
            "query": request.custom_query
        }
        
        # Perform analysis
        result = analyze_func(**analysis_params)
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )

# Error handler for generic exceptions
@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)