## 🌐 What is a Personal Vector Store (PVS)?

A **PVS** is a proposed standard for representing your **identity, expertise, and communication style** in a **portable format** that can be injected into any LLM conversation as contextual system prompts.

Think of it as your **digital professional identity**: a structured JSON file containing your background, skills, and preferences that gets converted into personalized system prompts for consistent interactions across different LLMs (OpenAI, Anthropic, Google, DeepSeek, etc.).

---

## 🎯 Goals

* Define an **interoperable format** for representing personal context as structured JSON
* Enable **consistent personalization** across different LLM providers and models
* Provide **systematic benchmarking** to evaluate response quality and consistency
* Build a **community standard** around portable personal context for AI interactions

---

## 📦 PVS Structure

Here’s an example structure in **JSON**:

```json
{
  "pvs_version": "0.1",
  "owner": {
    "name": "Javier Rojas",
    "role": "Software Engineer & Entrepreneur",
    "location": "Chile"
  },
  "identity": {
    "bio": "Backend engineer with Node.js, AWS, and e-commerce experience.",
    "skills": ["Node.js", "TypeScript", "AWS", "RAG", "PrestaShop"],
    "interests": ["AI Agents", "Startups", "E-commerce automation"]
  },
  "communication_style": {
    "tone": "direct",
    "languages": ["es", "en"],
    "preferences": {
      "answers": "short + rationale",
      "code": "no comments",
      "explanations": "always include the why"
    }
  },
  "embedding": {
    "model": "text-embedding-3-large",
    "vector": [0.123, -0.456, ...]
  }
}
```

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up your API keys (OpenAI required for embeddings)
cp .env.example .env  # Add OPENAI_API_KEY and other provider keys

# 3. Generate your PVS with embeddings from the example profile
npm run generate

# 4. Run benchmarks to compare baseline vs PVS-enhanced responses
npm run benchmark

# 5. Test with specific models
npm run benchmark -- --models openai:gpt-4o,anthropic:claude-3-5-sonnet-20241022

# 6. Analyze token usage of your system prompts
npm run analyze-tokens

# 7. Try the examples to see PVS in action
npm run example
```

See [docs/usage.md](docs/usage.md) for detailed documentation.

---

## 🧪 Project Structure

```
personal-vector-store/
├── src/                 # Core PVS library
│   ├── types.ts        # TypeScript interfaces
│   ├── generate_pvs.ts # PVS generator script
│   ├── embedding_service.ts
│   └── adapters/       # LLM adapters
├── examples/           # Usage examples and sample profiles
├── benchmarks/         # Benchmark suite and results
├── docs/              # Documentation
└── README.md
```

## ✅ Current Status

- ✅ **PVS Generator** → converts JSON profiles into PVS format with embeddings
- ✅ **Multi-Model Support** → OpenAI (GPT-4o, GPT-4o-mini), Anthropic (Claude-3.5), Google (Gemini), DeepSeek
- ✅ **System Prompt Generation** → converts PVS data into structured context prompts
- ✅ **Benchmark Framework** → systematic evaluation of baseline vs PVS-enhanced responses
- ✅ **Token Analysis Tools** → estimate and optimize system prompt token consumption
- ✅ **Enhanced CLI** → model selection, progress tracking, and structured output
- 🔄 **Community Standard** → iterating based on real-world usage and feedback

## ⚡ How PVS Actually Works

**PVS uses embeddings for generation, not injection.** Here's the actual workflow:

1. **JSON Profile** → Your identity, skills, and preferences in structured format
2. **Embedding Generation** → OpenAI creates a vector representation for similarity matching (future use)
3. **System Prompt Creation** → Your PVS data becomes a structured system prompt (~100-300 tokens)
4. **LLM Injection** → The text prompt (not the vector) is sent to any LLM for personalized responses

**The embedding vector is NOT sent to LLMs** - only the human-readable context derived from your PVS data.

```bash
# Analyze your token usage
npm run analyze-tokens
npm run token-demo  # Comprehensive analysis
```

---

## 📢 Contributing

* Open issues for feedback or feature requests.
* Submit PRs with implementations in different languages (Python, TypeScript, Go).
* Share evaluation results across models.
* Propose better format style.

---

## 📄 License

MIT — open for community use and improvement.


## 🚧 Known Issues & Limitations

- ⚠️ **Anthropic and other non-OpenAI adapters require thorough testing for benchmarking reliability**
- 📝 **Token estimation accuracy varies across different model providers (most accurate for OpenAI)**
- 🛠️ **PVS format is in early development; structure may evolve with community feedback**
- 🧪 **Comprehensive test suite and automated CI/CD pipeline are in development**
- 📄 **Advanced customization docs (custom adapters, embedding models) need expansion**
- 🔧 **Error handling and retry logic need improvement for production use**


If you encounter other issues, please open an issue or PR!

> **Disclaimer:**  
> Parts of this repository, including code, documentation, and design, were developed and refined with the assistance of advanced AI models, notably Anthropic's Claude 4 Sonnet. While human review and curation have been applied, some content may reflect the style, suggestions, or limitations of AI-generated output.  
>  
> Contributions and feedback from the community are welcome to further improve accuracy, clarity, and quality.

