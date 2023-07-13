# Use the official GoLang base image
FROM golang:latest

# Set the working directory inside the container
WORKDIR /app

# Copy the Go module files to the working directory
COPY go.mod go.sum ./

# Download and install Go module dependencies
RUN go mod download

# Copy the rest of the application source code to the working directory
COPY . .

# Build the Go application
RUN go build -o paymentapp

# Set the command to run the executable when the container starts
CMD ["./paymentapp"]
