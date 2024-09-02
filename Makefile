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

db-create:
	docker exec -it timescaledb psql -U postgres -c "CREATE DATABASE thingsboard;"

prod-up-new:
	docker compose up timescaledb -d
	docker compose up broker -d

	mvn clean install -DskipTests

make new-start:
	docker exec timescaledb psql -U postgres -c "CREATE DATABASE thingsboard;"
	cd ~/thingsboard/application/target/bin/install/
	export SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5434/thingsboard"
	export JAVA_OPTS="-DSPRING_DATASOURCE_URL=${SPRING_DATASOURCE_URL}"
	chmod +x install_dev_db.sh
	sudo -E ./install_dev_db.sh
	cd ~/thingsboard

	java -jar application/target/thingsboard-3.6.4-boot.jar

prod-up:
	docker compose up timescaledb -d
	docker compose up broker -d
	mvn install -DskipTests
