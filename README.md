# tempvs-ui

sudo docker build . -t tempvs-ui
sudo docker run --network="host" -p 80:80 tempvs-ui
