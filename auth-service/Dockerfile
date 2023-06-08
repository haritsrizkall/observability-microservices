# Base image
FROM node:18-alpine3.16

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript app
RUN npm run build

# RUN npx prisma migrate dev

# Expose the port your application listens on
EXPOSE 3001

# Specify the command to run your application
CMD ["npm", "start"]
