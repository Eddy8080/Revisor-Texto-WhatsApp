import requests
import json
import time

# Script de Teste de Estresse - DigIAna
# Dispara múltiplas requisições para validar a estabilidade do servidor local.

URL = "http://localhost:8080/v1/chat/completions"
MODES = [
    {"mode": "melhorar", "text": "Ola tudo bem? como vai voce? eu gostaria de saber se vc pode me ajudar com um problema tecnico no meu computador."},
    {"mode": "resumir", "text": "O projeto DigIAna é um assistente de escrita que roda localmente no Windows. Ele utiliza o modelo Qwen 2.5 3B para processar textos do WhatsApp e DigiSac. O objetivo principal é a privacidade, garantindo que nenhum dado saia do computador do usuário."}
]

def send_request(mode, text):
    payload = {
        "model": "local",
        "messages": [
            {"role": "system", "content": "Você é a DigIAna."},
            {"role": "user", "content": text}
        ],
        "temperature": 0.5,
        "max_tokens": 512,
        "stream": False
    }
    
    start_time = time.time()
    try:
        response = requests.post(URL, json=payload, timeout=60)
        duration = time.time() - start_time
        if response.status_code == 200:
            print(f"[OK] Modo: {mode:<10} | Tempo: {duration:.2f}s")
            return True
        else:
            print(f"[ERRO] Status: {response.status_code} | {response.text}")
            return False
    except Exception as e:
        print(f"[FALHA] Conexão: {e}")
        return False

def run_stress_test(cycles=10):
    print(f"=== Iniciando Teste de Estresse ({cycles * 2} requisições) ===")
    success_count = 0
    
    for i in range(cycles):
        print(f"\nCiclo {i+1}/{cycles}")
        for m in MODES:
            if send_request(m['mode'], m['text']):
                success_count += 1
            time.sleep(2) # Pequena pausa entre requisições
            
    print(f"\n=== Teste Concluído ===")
    print(f"Sucesso: {success_count}/{cycles * 2}")

if __name__ == "__main__":
    run_stress_test()
