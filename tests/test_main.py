import os
import sys
import importlib
import logging

# Ensure src package is on the path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, BASE_DIR)

# Create stub modules for flask and flask_cors
class FakeRequest:
    def __init__(self):
        self.json_data = None
    def get_json(self):
        return self.json_data

request = FakeRequest()

class Flask:
    def __init__(self, name):
        self.name = name
        self.routes = {}
    def route(self, path, methods=None):
        def decorator(func):
            self.routes[(path, tuple(methods) if methods else None)] = func
            return func
        return decorator

def jsonify(**kwargs):
    return kwargs

sys.modules['flask'] = type(sys)('flask')
sys.modules['flask'].Flask = Flask
sys.modules['flask'].request = request
sys.modules['flask'].jsonify = jsonify
sys.modules['flask_cors'] = type(sys)('flask_cors')
sys.modules['flask_cors'].CORS = lambda app: None

# Import module under test
import src.ai.main as main
importlib.reload(main)


def test_create_app_and_routes():
    os.environ.pop('OPENAI_API_KEY', None)
    app = main.create_app()
    assert isinstance(app, Flask)
    assert ('/health', ('GET',)) in app.routes
    assert ('/analyze', ('POST',)) in app.routes
    assert ('/dashboard', ('GET',)) in app.routes


def test_analyze_without_openai(tmp_path):
    log_file = tmp_path / 'app.log'
    os.environ['LOG_FILE'] = str(log_file)
    # Reset logging to allow basicConfig in module to recreate handlers
    logging.getLogger().handlers.clear()
    importlib.reload(main)
    app = main.create_app()
    analyze = app.routes[('/analyze', ('POST',))]
    main.request.json_data = {'script': 'Write-Host "Hello"'}
    result, status = analyze()
    for handler in logging.getLogger(main.__name__).handlers:
        handler.flush()
    assert status == 500
    assert result['error'] == 'OpenAI package not installed'
    assert log_file.read_text()
