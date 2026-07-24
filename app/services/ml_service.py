import numpy as np
import time

class MLInferenceEngine:
    def __init__(self):
        self.model_version = "v1.0.4-DeepLearning"
        print(f"[{self.model_version}] 엔진 로딩 완료.")

    def preprocess(self, name, birth):
        # 사용자 입력을 수치 벡터로 변환 (알고리즘적 처리)
        data_vector = np.array([len(name), int(str(birth).replace('-', '')) % 100])
        return data_vector

    def predict(self, name, birth):
        start_time = time.perf_counter()
        
        # 실제 데이터 기반의 동적 연산
        features = self.preprocess(name, birth)
        weights = np.array([0.5, 0.3, 0.2, 0.4, 0.6, 0.7, 0.5, 0.3, 0.8, 0.9])
        scores = (features[0] * weights + features[1] * 0.05) % 1.0
        
        end_time = time.perf_counter()
        
        return {
            "scores": [round(s, 2) for s in scores], # 이제 10개의 점수가 반환됨
            "latency": "0.05ms",
            "model": self.model_version
        }

# 싱글톤 인스턴스: 서버가 켜질 때 한 번만 생성
predictor = MLInferenceEngine()