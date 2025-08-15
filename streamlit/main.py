from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
import torch

# Load the PyTorch model (slower but has thinking mode)
model_id = "aisingapore/Llama-SEA-LION-v3.5-8B-R"

# Load tokenizer and model
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    torch_dtype=torch.bfloat16,
    device_map="auto"
)

# Create pipeline for easier use
pipe = pipeline(
    "text-generation",
    model=model,
    tokenizer=tokenizer,
    torch_dtype=torch.bfloat16,
    device_map="auto"
)

# Export for other files to use
__all__ = ['pipe', 'tokenizer']