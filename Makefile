run:
	java -jar application/target/thingsboard-3.6.4-boot.jar

up:
	docker compose up timescaledb -d
	docker compose up broker -d

rabitmq-plugin:
	docker exec -it thingsboard-broker rabbitmq-plugins enable rabbitmq_management

down:
	docker compose down

timescaledb:
	docker exec -it timescaledb psql -d thingsboard

prod-up:
	docker compose up timescaledb -d
	docker compose up broker -d
	mvn install -DskipTests
	chmod +x application/target/bin/install/install_dev_db.sh
	./application/target/bin/install/install_dev_db.sh
	java -jar application/target/thingsboard-3.6.4-boot.jar &
