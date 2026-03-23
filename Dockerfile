FROM node:20-slim

# Install Python and pip (required for get_transcript.py)
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

# Create and activate a python virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install the required python library for transcripts
RUN pip install youtube-transcript-api==1.2.4

# Set up the application directory
WORKDIR /app

# Copy package files and install node modules
COPY package*.json ./
RUN npm install --production

# Copy all project files into the container
COPY . .

# Let Render bind to its required port (server.js already handles process.env.PORT)
ENV NODE_ENV=production

# Start the Node.js server
CMD ["npm", "start"]
