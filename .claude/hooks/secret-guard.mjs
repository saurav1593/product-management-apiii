import { join } from 'path';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const event = JSON.parse(Buffer.concat(chunks).toString());

const toolName = event?.tool_name;
const args = event?.tool_input ?? {};
const filePath = args.file_path ?? '';

// Allow .env.example files
if (filePath.endsWith('.env.example')) {
  process.exit(0);
}

// Extract the content being written/edited
let content = '';
if (toolName === 'Write') {
  content = args.content ?? '';
} else if (toolName === 'Edit') {
  content = args.new_string ?? '';
} else if (toolName === 'MultiEdit') {
  // MultiEdit is an array of edits, check all new_strings
  content = JSON.stringify(args.edits ?? []);
}

if (!content) {
  process.exit(0);
}

const secrets = [
  {
    name: 'AWS Access Key',
    regex: /AKIA[A-Z0-9]{16}/,
    envVar: 'AWS_ACCESS_KEY_ID'
  },
  {
    name: 'Generic Secret Key',
    regex: /sk-[a-zA-Z0-9]{20,}/,
    envVar: 'SECRET_KEY'
  },
  {
    name: 'Password',
    regex: /password\s*[:=]\s*["'][^"']*["']/,
    envVar: 'PASSWORD'
  }
];

for (const secret of secrets) {
  if (secret.regex.test(content)) {
    process.stdout.write(JSON.stringify({
      continue: false,
      decision: 'block',
      reason: `Secret leak detected: ${secret.name} found in the content. Please use process.env.${secret.envVar} instead of hardcoding secrets.`,
      systemMessage: `Blocked: ${secret.name} leak detected. Use environment variables instead.`
    }));
    process.exit(0);
  }
}

process.exit(0);
