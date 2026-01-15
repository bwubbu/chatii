# Repository: https://github.com/bwubbu/ramahai/tree/docker-assignment
# Dockerfile for Next.js Chat Application
# Alternative Assessment For WIF3005

# Base image - Node.js 18 Alpine
FROM node:18-alpine

# Working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies (using --legacy-peer-deps to resolve React 19 compatibility)
RUN npm install --legacy-peer-deps

# Copy application files
COPY . .

# Build-time arguments with placeholder defaults
ARG NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_anon_key_for_build
ARG SUPABASE_SERVICE_ROLE_KEY=placeholder_service_key_for_build
ARG GEMINI_API_KEY=placeholder_gemini_key
ARG COHERE_API_KEY=placeholder_cohere_key
ARG OPENAI_API_KEY=placeholder_openai_key
ARG PRIMARY_LLM=gemini
ARG GOOGLE_CLOUD_PROJECT_ID=placeholder-project-id
ARG GOOGLE_CLOUD_LOCATION=us-central1
ARG VERTEX_AI_MODEL=llama-3-8b-instruct
ARG GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"placeholder","project_id":"placeholder"}

# Convert ARG to ENV for build process
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV COHERE_API_KEY=$COHERE_API_KEY
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV PRIMARY_LLM=$PRIMARY_LLM
ENV GOOGLE_CLOUD_PROJECT_ID=$GOOGLE_CLOUD_PROJECT_ID
ENV GOOGLE_CLOUD_LOCATION=$GOOGLE_CLOUD_LOCATION
ENV VERTEX_AI_MODEL=$VERTEX_AI_MODEL
ENV GOOGLE_APPLICATION_CREDENTIALS_JSON=$GOOGLE_APPLICATION_CREDENTIALS_JSON

# Build Next.js application
RUN npm run build

# Expose port 5000 (as required by assignment)
EXPOSE 5000

# Run command - start the application on port 5000
CMD ["npm", "start"]
