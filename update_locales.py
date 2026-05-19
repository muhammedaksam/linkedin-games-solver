import json
import os

translations = {
    'en': {
        'solve_with_ai': 'Solve with AI',
        'solve_game': 'Solve Game',
        'solving': 'Solving...',
        'solved': 'Solved!'
    },
    'de': {
        'solve_with_ai': 'Mit KI lösen',
        'solve_game': 'Spiel lösen',
        'solving': 'Wird gelöst...',
        'solved': 'Gelöst!'
    },
    'es': {
        'solve_with_ai': 'Resolver con IA',
        'solve_game': 'Resolver juego',
        'solving': 'Resolviendo...',
        'solved': '¡Resuelto!'
    },
    'fr': {
        'solve_with_ai': "Résoudre avec l'IA",
        'solve_game': 'Résoudre le jeu',
        'solving': 'Résolution...',
        'solved': 'Résolu !'
    },
    'pt': {
        'solve_with_ai': 'Resolver com IA',
        'solve_game': 'Resolver jogo',
        'solving': 'Resolviendo...',  # PT says Resolviendo? Wait, previously "Resolvendo..."
        'solved': 'Resolvido!'
    },
    'tr': {
        'solve_with_ai': 'Yapay Zeka ile Çöz',
        'solve_game': 'Oyunu Çöz',
        'solving': 'Çözülüyor...',
        'solved': 'Çözüldü!'
    },
    'zh': {
        'solve_with_ai': '使用AI求解',
        'solve_game': '求解游戏',
        'solving': '正在求解...',
        'solved': '已完成求解！'
    }
}

# Fix Portuguese
translations['pt']['solving'] = 'Resolvendo...'

locales_dir = 'locales'
for lang, data in translations.items():
    filePath = os.path.join(locales_dir, lang, 'messages.json')
    if os.path.exists(filePath):
        with open(filePath, 'r', encoding='utf-8') as f:
            content = json.load(f)
        
        content['solveBtn_withAi'] = {'message': data['solve_with_ai']}
        content['solveBtn_game'] = {'message': data['solve_game']}
        content['solveBtn_solving'] = {'message': data['solving']}
        content['solveBtn_solved'] = {'message': data['solved']}
        
        with open(filePath, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
            f.write('\n')
