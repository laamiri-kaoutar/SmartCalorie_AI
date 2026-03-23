from prometheus_client import Counter, Histogram


ML_PREDICTION_LATENCY = Histogram(
    "ml_prediction_latency_seconds",
    "Latency for workout calorie prediction model inference.",
    buckets=(0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0),
)

AI_RECOMMENDATION_LATENCY = Histogram(
    "ai_recommendation_latency_seconds",
    "Latency for AI meal recommendation generation.",
    buckets=(0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 30.0, 60.0),
)

AI_RECOMMENDATION_RETRIES = Counter(
    "ai_recommendation_retries_total",
    "Total number of ingredient-resolution retries during recommendation generation.",
)

PREDICTED_CALORIES_VALUE = Histogram(
    "predicted_calories_value",
    "Observed predicted calorie values.",
    buckets=(10, 25, 50, 75, 100, 150, 200, 300, 400, 600, 800, 1200, 1600),
)
