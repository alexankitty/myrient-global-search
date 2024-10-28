# Use Node.js LTS version
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Create data directory for persistent files
RUN mkdir -p /usr/src/app/data

# Expose the port
EXPOSE 8062

# Start the application
CMD ["node", "server.js"]