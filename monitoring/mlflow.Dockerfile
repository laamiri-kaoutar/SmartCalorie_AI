FROM ghcr.io/mlflow/mlflow:latest

# Install the driver properly during the build, not at runtime
RUN pip install psycopg2-binary