FROM maven:3.8.6-openjdk-11 AS build

WORKDIR /app

# COPY pom.xml /app/pom.xml
# COPY application /app/application
# COPY common /app/common
# COPY dao /app/dao
# COPY monitoring /app/monitoring
# COPY msa /app/msa
# COPY netty-mqtt /app/netty-mqtt
# COPY packaging /app/packaging
# COPY rest-client /app/rest-client
# COPY rule-engine /app/rule-engine
# COPY tools /app/tools
# COPY transport /app/transport
# COPY /ui-ngx/pom.xml /app/ui-ngx/pom.xml
# COPY build_proto.sh /app/build_proto.sh
# COPY license-header-template.txt /app/license-header-template.txt
# COPY lombok.config /app/lombok.config
# RUN mvn dependency:go-offline

# COPY ui-ngx /app/ui-ngx

COPY . .
RUN mvn install -DskipTests

RUN chmod +x ./application/target/bin/install/install_dev_db.sh
RUN ./application/target/bin/install/install_dev_db.sh

FROM openjdk:11-jre-slim

COPY --from=build /app/application/target/thingsboard-3.6.4-boot.jar /app/thingsboard-3.6.4-boot.jar

CMD ["java", "-jar", "/app/thingsboard-3.6.4-boot.jar"]
