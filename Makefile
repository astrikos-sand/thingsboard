run:
	java -jar application/target/thingsboard-3.6.4-boot.jar

up:
	docker compose up --build -d

rabitmq-plugin:
	docker exec -it thingsboard-broker rabbitmq-plugins enable rabbitmq_management

down:
	docker compose down

timescaledb:
	docker exec -it timescaledb psql -d thingsboard
