FROM python:3.12-slim

WORKDIR /app

# Copy python package and examples
COPY python/ /app/python/

# Install VennQL in production mode
RUN pip install --no-cache-dir ./python

ENV HOST=0.0.0.0
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

EXPOSE 8080

# Run the VennQL API server
CMD ["python", "python/examples/bookstore_server.py"]
