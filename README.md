## 🌐 What is a Personal Vector Store (PVS)?

A **PVS** is a proposed standard for representing your **identity, expertise, and communication style** in a **portable vectorized format**.

Think of it as your **business card as context**: something you can inject into any LLM (GPT-5, Claude-4, Gemini, DeepSeek, etc.) to reduce cold starts and enable consistent personalization **independent of the platform**.

---

## 🎯 Goals

* Define an **interoperable format** (JSON + embeddings) for representing personal context.
* Allow **plug-and-play loading** of a PVS into different LLMs.
* Evaluate **response quality and consistency** across models when using the same PVS.
* Build a **community standard** around PVS to drive adoption.

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

## 🚀 How to Use a PVS

1. Generate embeddings from the `identity + communication_style` fields.
2. Store them in a vector database (Chroma, Pinecone, Weaviate, etc.).
3. At session start, **inject the PVS** into the LLM as part of the system prompt or context.
4. Measure response consistency and alignment.

---

## 🧪 Roadmap for Proofs of Concept (PoCs)

1. **PVS Generator** → script that converts JSON → embeddings.
2. **Model Adapters** → test injection with GPT-5, Claude-4, Gemini, DeepSeek.
3. **Benchmarks**

   * Baseline vs. PVS-injected responses
   * Metrics: alignment with identity, consistency, token cost
4. **Format Experiments**

   * JSON + embeddings
   * Plain structured text
   * Hybrid metadata

---

## 📢 Contributing

* Open issues for feedback or feature requests.
* Submit PRs with implementations in different languages (Python, TypeScript, Go).
* Share evaluation results across models.
* Propose better format style.

---

## 📄 License

MIT — open for community use and improvement.
