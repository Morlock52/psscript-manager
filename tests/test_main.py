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
    assert ('/stats', ('GET',)) in app.routes


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


def test_stats_increment_on_success(tmp_path):
    class FakeChatCompletion:
        @staticmethod
        def create(model, messages, temperature):
            return type('Resp', (), {
                'choices': [type('Choice', (), {'message': {'content': 'ok'}})]
            })

    class FakeOpenAI:
        api_key = 'test'
        ChatCompletion = FakeChatCompletion

    log_file = tmp_path / 'app.log'
    os.environ['LOG_FILE'] = str(log_file)
    os.environ['OPENAI_API_KEY'] = 'test'
    logging.getLogger().handlers.clear()
    importlib.reload(main)
    main.openai = FakeOpenAI
    app = main.create_app()
    analyze = app.routes[('/analyze', ('POST',))]
    stats = app.routes[('/stats', ('GET',))]

    main.request.json_data = {'script': 'Write-Host "Hi"'}
    response = analyze()
    if isinstance(response, tuple):
        result, status = response
    else:
        result, status = response, 200
    assert status == 200
    assert result['analysis'] == 'ok'
    assert stats()['analysis_count'] == 1


def test_models_endpoint_without_openai(tmp_path):
    log_file = tmp_path / 'app.log'
    os.environ['LOG_FILE'] = str(log_file)
    logging.getLogger().handlers.clear()
    importlib.reload(main)
    main.openai = None
    app = main.create_app()
    models = app.routes[('/models', ('GET',))]
    result, status = models()
    assert status == 500
    assert 'error' in result


def test_update_config_persists_env(tmp_path):
    class FakeModel:
        @staticmethod
        def list():
            return {'data': [{'id': 'gpt-3'}, {'id': 'gpt-4'}]}

    class FakeOpenAI:
        api_key = 'old'
        Model = FakeModel
        ChatCompletion = type('Chat', (), {})

    env_file = tmp_path / '.env'
    os.environ['ENV_FILE'] = str(env_file)
    os.environ['OPENAI_API_KEY'] = 'old'
    logging.getLogger().handlers.clear()
    importlib.reload(main)
    main.openai = FakeOpenAI
    app = main.create_app()
    update = app.routes[('/config', ('POST',))]
    main.request.json_data = {'api_key': 'new', 'model': 'gpt-4'}
    result, status = update()
    assert status == 200
    assert main.openai.api_key == 'new'
    assert 'OPENAI_MODEL=gpt-4' in env_file.read_text()


def test_get_config_returns_state(tmp_path):
    class FakeOpenAI:
        api_key = 'abc'
        Model = type('M', (), {})
        ChatCompletion = type('Chat', (), {})

    os.environ['OPENAI_API_KEY'] = 'abc'
    os.environ['OPENAI_MODEL'] = 'gpt-test'
    logging.getLogger().handlers.clear()
    importlib.reload(main)
    main.openai = FakeOpenAI
    app = main.create_app()
    get_config = app.routes[('/config', ('GET',))]
    result, status = get_config()
    assert status == 200
    assert result['model'] == 'gpt-test'
    assert result['api_key_configured'] is True
