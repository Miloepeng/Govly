# Govly - Llama-SEA-LION Language Model Project

This project provides a complete testing and evaluation framework for the Llama-SEA-LION-v3.5-8B-R language model, specifically optimized for Southeast Asian languages and contexts.

## Features

- **Model Loading**: PyTorch-based loading with BF16 precision and automatic GPU detection
- **Text Generation**: Flexible text generation with customizable parameters
- **Thinking Mode Control**: Toggle between direct answers and reasoning mode
- **Streamlit Web Interface**: Beautiful web-based chat interface
- **Interactive Chat**: Command-line interface for real-time conversations
- **Testing Tools**: Automated test cases and quality assessment

## Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd Govly
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **For Streamlit interface**:
   ```bash
   pip install -r requirements_streamlit.txt
   ```

4. **Verify installation**:
   ```bash
   python -c "import torch; print(f'PyTorch version: {torch.__version__}')"
   python -c "import transformers; print(f'Transformers version: {transformers.__version__}')"
   ```

## Usage

### 1. Streamlit Web Interface (Recommended)

Launch the beautiful web-based chat interface:

```bash
cd govly
streamlit run streamlit_app.py
```

**Features**:
- **Thinking Mode Control**: Toggle between direct answers and reasoning
- **Adjustable Parameters**: Control response length and creativity
- **Real-time Chat**: Professional web interface
- **Chat History**: Persistent conversation memory

### 2. Interactive Command Line Chat

Start a real-time chat session with the model:

```bash
cd govly
python chat_test.py
```

**Available Commands**:
- Type any question to chat with the model
- Type `quit` to exit

### 3. Custom Usage

Import the model in your own scripts:

```python
from govly.main import pipe, tokenizer

# Generate text with thinking mode control
prompt = tokenizer.apply_chat_template(
    messages,
    add_generation_prompt=True,
    tokenize=False,
    thinking_mode="off"  # "off" for direct, "on" for reasoning
)

response = pipe(prompt, max_new_tokens=100)
```

## Model Information

- **Model**: `aisingapore/Llama-SEA-LION-v3.5-8B-R`
- **Format**: PyTorch (Full Quality)
- **Size**: 8 billion parameters (~16GB+ download)
- **Precision**: BF16 (Brain Float 16)
- **Optimization**: Automatic GPU mapping
- **Specialization**: Southeast Asian languages and contexts
- **Thinking Mode**: Configurable on/off

## Configuration

### Generation Parameters

- **Temperature**: 0.7 (balanced creativity vs coherence)
- **Max Tokens**: 150 tokens (configurable)
- **Thinking Mode**: "off" for direct answers, "on" for reasoning
- **Sampling**: Enabled for diverse responses

### Hardware Requirements

- **Minimum**: 16GB RAM, CPU-only inference
- **Recommended**: 24GB+ RAM, CUDA-compatible GPU or Apple MPS
- **Optimal**: 32GB+ RAM, RTX 4090 or equivalent

## Thinking Mode Control

### What is Thinking Mode?

- **"off"**: Direct, concise answers without explanation
- **"on"**: Shows reasoning process and detailed explanations

### How to Control:

```python
# In Streamlit: Use the sidebar dropdown
# In code: Set thinking_mode parameter
thinking_mode = "off"  # or "on"
```

## Troubleshooting

### Common Issues

1. **Out of Memory Errors**:
   - Reduce `max_new_tokens` parameter
   - Use CPU-only inference: `device_map="cpu"`
   - Enable gradient checkpointing

2. **Slow Generation**:
   - First run downloads ~16GB model (takes time)
   - Ensure GPU/MPS is being used
   - Check PyTorch version compatibility

3. **Import Errors**:
   - Verify all dependencies are installed
   - Check Python version compatibility (3.8+)
   - Reinstall transformers: `pip install --force-reinstall transformers`

### Performance Tips

- Use `torch.inference_mode()` for faster inference
- Batch multiple prompts when possible
- Monitor GPU memory usage
- First generation is slowest, subsequent are faster

## Development

### Project Structure

```
govly/
├── main.py              # PyTorch model loading and pipeline
├── streamlit_app.py     # Web-based chat interface
├── chat_test.py         # Command-line chat interface
├── models/              # Model storage (if downloading locally)
└── data/                # Dataset storage
```

### Adding New Features

1. **Streamlit Interface**: Modify `streamlit_app.py`
2. **Chat Logic**: Update `chat_test.py`
3. **Model Configuration**: Adjust `main.py`

### Customizing Generation

Modify generation parameters in the Streamlit app or scripts:

```python
response = pipe(
    prompt,
    max_new_tokens=200,        # Longer responses
    temperature=0.9,           # More creative
    do_sample=True,            # Enable sampling
    pad_token_id=tokenizer.eos_token_id
)
```

## License

This project uses the Llama-SEA-LION model which is subject to its own license terms. Please review the model's license before commercial use.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## Support

For issues and questions:
- Check the troubleshooting section
- Review PyTorch and Transformers documentation
- Open an issue with detailed error information

---

**Note**: The first run will download the PyTorch model (~16GB), which may take some time depending on your internet connection. The model supports thinking mode control for flexible response styles.
