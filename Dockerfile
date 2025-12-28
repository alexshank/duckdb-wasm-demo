FROM node:18-alpine

WORKDIR /app

# Copy application files
COPY src/ ./src/

# Install serve globally
RUN npm install -g serve

# Expose port 5000
EXPOSE 5000

# Run the application
CMD ["serve", "src", "-l", "5000"]
