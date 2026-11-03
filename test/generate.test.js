const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { generateCartoonScript } = require('../generate');

async function testMissingApiKey() {
  const originalEnv = process.env.GOOGLE_GENERATIVE_API_KEY;
  delete process.env.GOOGLE_GENERATIVE_API_KEY;
  try {
    let errorThrown = false;
    try {
      await generateCartoonScript({ apiKey: '' });
    } catch (err) {
      errorThrown = true;
      assert(err.message.includes('Missing API key'), 'Error should mention missing API key');
    }
    assert.strictEqual(errorThrown, true, 'Should throw error when API key is missing');
    console.log('✓ testMissingApiKey passed');
  } finally {
    if (originalEnv) {
      process.env.GOOGLE_GENERATIVE_API_KEY = originalEnv;
    }
  }
}

async function testSuccessfulGenerationMock() {
  const mockPayload = {
    candidates: [
      {
        content: {
          parts: [{ text: 'Mock cartoon script response' }]
        }
      }
    ]
  };

  const mockFetch = async (url, options) => {
    assert(url.includes('models/test-model:generateContent'), 'URL should include model');
    assert(url.includes('key=test-key'), 'URL should include key');
    assert.strictEqual(options.method, 'POST');
    const parsedBody = JSON.parse(options.body);
    assert.strictEqual(parsedBody.contents[0].parts[0].text, 'Test prompt');

    return {
      ok: true,
      status: 200,
      json: async () => mockPayload
    };
  };

  const testOutputPath = path.resolve(__dirname, 'temp_output.json');
  if (fs.existsSync(testOutputPath)) {
    fs.unlinkSync(testOutputPath);
  }

  const result = await generateCartoonScript({
    apiKey: 'test-key',
    model: 'test-model',
    prompt: 'Test prompt',
    outputPath: testOutputPath,
    fetchFn: mockFetch
  });

  assert.deepStrictEqual(result, mockPayload, 'Returned result should match mock payload');
  assert(fs.existsSync(testOutputPath), 'Output file should be written');

  const fileContent = JSON.parse(fs.readFileSync(testOutputPath, 'utf8'));
  assert.deepStrictEqual(fileContent, mockPayload, 'File content should match payload');

  fs.unlinkSync(testOutputPath);
  console.log('✓ testSuccessfulGenerationMock passed');
}

async function testApiFailureMock() {
  const mockFetch = async () => {
    return {
      ok: false,
      status: 403,
      text: async () => 'API key not valid'
    };
  };

  let errorThrown = false;
  try {
    await generateCartoonScript({
      apiKey: 'invalid-key',
      fetchFn: mockFetch
    });
  } catch (err) {
    errorThrown = true;
    assert(err.message.includes('403'), 'Error message should include status 403');
    assert(err.message.includes('API key not valid'), 'Error message should include error text');
  }

  assert.strictEqual(errorThrown, true, 'Should throw on API response failure');
  console.log('✓ testApiFailureMock passed');
}

async function runTests() {
  console.log('Running generate.js tests...');
  await testMissingApiKey();
  await testSuccessfulGenerationMock();
  await testApiFailureMock();
  console.log('All generate.js unit tests passed successfully!\n');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
