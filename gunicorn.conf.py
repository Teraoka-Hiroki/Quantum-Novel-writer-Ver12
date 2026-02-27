# Gunicorn configuration file
import multiprocessing

# タイムアウトを120秒に設定
timeout = 120

# 【重要】データ共有のため、ワーカー数を「1」に固定します
workers = 1
threads = 4

# アプリケーションを事前にロードする（メモリ節約と高速化）
preload_app = True

# ログ出力設定
accesslog = '-'
errorlog = '-'
loglevel = 'info'