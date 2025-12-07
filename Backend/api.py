from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from langchain_core.messages import SystemMessage, ToolMessage, AIMessage, HumanMessage
from langchain_mistralai import ChatMistralAI
from langgraph.graph import StateGraph, START, END
from typing_extensions import TypedDict
import os
import uuid
from typing import Dict
import io
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ResuMatch API", version="1.0.0")

# CORS middleware - allow frontend to access backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Check if API key is available
if not os.getenv('MISTRAL_API_KEY'):
    print("Warning: MISTRAL_API_KEY not found. Please add it to your .env file.")

# Initialize LLM
model = "mistral-small-latest"
llm = ChatMistralAI(
    model=model,
    temperature=0,
    max_retries=5
)

# State definition
class State(TypedDict):
    messages: Dict

# Request models
class TextInputRequest(BaseModel):
    cv_content: str
    job_content: str

class ProcessResponse(BaseModel):
    evaluation: str
    email: str
    status: str = "success"

def read_pdf(file_content: bytes) -> str:
    """Extract text from PDF file."""
    try:
        from PyPDF2 import PdfReader
        pdf_reader = PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        return text
    except ImportError:
        raise HTTPException(status_code=500, detail="PDF support requires PyPDF2. Install it using 'pip install PyPDF2'")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF: {str(e)}")

def read_text_file(file_content: bytes) -> str:
    """Extract text from text file."""
    try:
        return file_content.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid text file encoding. Please use UTF-8.")

# Function to process the CV and job description
def process_cv_job(cv_content: str, job_content: str):
    """
    Process CV and job description to generate evaluation and email.
    Returns dict with 'evaluation' and 'email' keys.
    """
    if not cv_content or not job_content:
        raise HTTPException(status_code=400, detail="CV content and job content are required")
    
    # Initialize the workflow
    workflow = StateGraph(State)
    
    # Define each node function
    def get_cv_content(state: dict):
        tool_call = ToolMessage(
            content=cv_content,
            tool_call_id=str(uuid.uuid4())
        )
        
        new_state = {
            "messages": {
                "cv_content": tool_call
            }
        }
        return new_state
    
    def get_job_description(state: dict):
        tool_call = ToolMessage(
            content=job_content,
            tool_call_id=str(uuid.uuid4())
        )
        
        new_state = {
            "messages": {
                "cv_content": state['messages']['cv_content'],
                "job_content": tool_call
            }
        }
        return new_state
    
    def evaluate_match(state: dict):
        # Extract the CV and job description content
        cv = state["messages"]["cv_content"].content
        job = state["messages"]["job_content"].content
        
        # Create evaluation prompts
        hum_evaluation_template = """CV:
        {cv}
        ===
        Job Description:
        {job}
        ===
        Evaluate whether the CV aligns with the job description provided. Clearly indicate the degree of match and provide specific reasons for your assessment, ensuring a detailed and professional response:
        """
        hum_evaluation_prompt = hum_evaluation_template.format(cv=cv, job=job)
        sys_evaluation_prompt = """You are tasked with evaluating whether the CV aligns with the job description provided. Clearly indicate the degree of match and provide specific, detailed reasons for your assessment."""
        
        # Invoke the LLM
        response = llm.invoke([SystemMessage(content=sys_evaluation_prompt),
                               HumanMessage(content=hum_evaluation_prompt)])
        content = response.content.strip()
        
        ai_call = AIMessage(
            content=content,
            ai_call_id=str(uuid.uuid4())
        )
        
        new_state = {
            "messages": {
                "evaluation": ai_call
            }
        }
        return new_state
    
    def generate_email(state: dict):
        evaluation_result = state["messages"]["evaluation"].content
        
        hum_email_template = """Job Application Evaluation:
        {evaluation}
        ===
        Based on the evaluation of the match between the candidate's CV and the job description, draft an email to the candidate communicating the result of the assessment. Clearly indicate whether or not the candidate has been selected for the position and provide the reasons for the decision. Ensure the tone is polite, professional, and respectful, starting the email with a courteous acknowledgment.
        Email:
        """
        hum_email_prompt = hum_email_template.format(evaluation=evaluation_result)
        sys_email_prompt = """You are a hiring manager tasked with drafting an email to a candidate regarding the result of their job application assessment. Clearly communicate whether the candidate has been selected for the position, and provide reasons for the decision. Maintain a polite, professional, and respectful tone, starting the email with a courteous acknowledgment."""
        
        response = llm.invoke([SystemMessage(content=sys_email_prompt),
                               HumanMessage(content=hum_email_prompt)])
        content = response.content.strip()
        
        ai_call = AIMessage(
            content=content,
            ai_call_id=str(uuid.uuid4())
        )
        
        new_state = {
            "messages": {
                "email": ai_call,
                "evaluation": state["messages"]["evaluation"]
            }
        }
        
        return new_state
    
    # Build workflow graph
    workflow.add_node("read_cv", get_cv_content)
    workflow.add_node("get_job_description", get_job_description)
    workflow.add_node("evaluate_match", evaluate_match)
    workflow.add_node("generate_email", generate_email)
    
    workflow.add_edge(START, "read_cv")
    workflow.add_edge("read_cv", "get_job_description")
    workflow.add_edge("get_job_description", "evaluate_match")
    workflow.add_edge("evaluate_match", "generate_email")
    workflow.add_edge("generate_email", END)
    
    # Compile and run the graph
    graph = workflow.compile()
    
    # Start with an empty state
    start_state = {"messages": {}}
    
    # Execute the workflow
    final_output = None
    for output in graph.stream(start_state):
        final_output = output
    
    # Return the evaluation and email
    if final_output and 'generate_email' in final_output:
        return {
            "evaluation": final_output['generate_email']['messages']['evaluation'].content,
            "email": final_output['generate_email']['messages']['email'].content
        }
    else:
        raise HTTPException(status_code=500, detail="Error processing CV and job description")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "ResuMatch API is running", "status": "healthy"}


@app.post("/api/process-text", response_model=ProcessResponse)
async def process_text(request: TextInputRequest):
    """
    Process CV and job description from text input.
    """
    try:
        result = process_cv_job(request.cv_content, request.job_content)
        return ProcessResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")


def get_file_type(filename: str, content_type: str = None) -> str:
    """
    Determine file type from filename extension or content type.
    Returns 'pdf' or 'text'.
    """
    filename_lower = filename.lower()
    
    # Check extension first (more reliable)
    if filename_lower.endswith('.pdf'):
        return 'pdf'
    elif filename_lower.endswith('.txt'):
        return 'text'
    
    # Fallback to content type
    if content_type:
        if content_type == 'application/pdf':
            return 'pdf'
        elif content_type == 'text/plain':
            return 'text'
    
    raise HTTPException(status_code=400, detail=f"Invalid file type. Only PDF and TXT files are allowed.")


@app.post("/api/process-files", response_model=ProcessResponse)
async def process_files(
    cv_file: UploadFile = File(...),
    job_file: UploadFile = File(...)
):
    """
    Process CV and job description from uploaded files.
    Supports TXT and PDF files.
    """
    try:
        # Determine file types
        cv_file_type = get_file_type(cv_file.filename, cv_file.content_type)
        job_file_type = get_file_type(job_file.filename, job_file.content_type)
        
        # Read CV file
        cv_bytes = await cv_file.read()
        if cv_file_type == 'pdf':
            cv_content = read_pdf(cv_bytes)
        else:
            cv_content = read_text_file(cv_bytes)
        
        # Read job description file
        job_bytes = await job_file.read()
        if job_file_type == 'pdf':
            job_content = read_pdf(job_bytes)
        else:
            job_content = read_text_file(job_bytes)
        
        # Process the files
        result = process_cv_job(cv_content, job_content)
        return ProcessResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing files: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

