from celery import Celery

app = Celery('wheels_wins')
app.config_from_object('celeryconfig')

if __name__ == '__main__':
    app.start()
