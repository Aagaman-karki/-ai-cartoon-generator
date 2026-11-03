const apiKey = process.env.GOOGLE_GENERATIVE_API_KEY;

async function run() {
  console.log("Generating animation script...");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Write an 8-minute animation script and visual layout about: What if time stopped synchronizing?" }] }]
    })
  });
  
  const data = await response.json();
  if (response.ok) {
    console.log("✅ Successfully generated specification!");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("❌ API Error:", JSON.stringify(data, null, 2));
  }
}

run().catch(console.error);
