module.exports = {
  apps: [
    {
      name: "ris-backend",
      script: "server.js",
      cwd: "./risbackend",
      watch: ["server.js", "routes", "services", "models", "controllers"],
      ignore_watch: ["node_modules", "logs", "uploads", "backend.log", "server.log"],
      env: {
        NODE_ENV: "development",
        PORT: 5000
      }
    },
    {
      name: "ris-frontend",
      script: "npm",
      args: "start",
      cwd: "./risfrontend",
      watch: false,
      env: {
        NODE_ENV: "development",
        VITE_PORT: 3000
      }
    },
    {
      name: "ris-vosk",
      script: "python3",
      args: "vosk_server.py",
      cwd: "./",
      watch: ["vosk_server.py", "radiology_dictionary.json"],
      interpreter: "python3",
      env: {
        PYTHONUNBUFFERED: "1"
      }
    }
  ]
};
