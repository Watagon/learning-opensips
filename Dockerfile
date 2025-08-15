FROM debian:bullseye

# Set Environment Variables
ENV DEBIAN_FRONTEND=noninteractive

ARG user_name
ARG git_user_name
ARG git_user_email

ARG USER_UID=1000
ARG USER_GID=$USER_UID

SHELL ["/bin/bash", "--login", "-c"]

#install basic components
RUN apt-get -y update -qq && apt-get -y install gnupg2 ca-certificates bison flex build-essential sudo tmuxinator vim curl net-tools tree

# install sip-lab deps
RUN apt-get -y install build-essential automake autoconf libtool libspeex-dev libopus-dev libsdl2-dev libavdevice-dev libswscale-dev libv4l-dev libopencore-amrnb-dev libopencore-amrwb-dev libvo-amrwbenc-dev libvo-amrwbenc-dev libboost-dev libtiff-dev libpcap-dev libssl-dev uuid-dev flite-dev cmake git wget 

# install sngrep deps
RUN apt-get -y install libpcap-dev libncurses5 libssl-dev libncursesw5-dev libpcre2-dev libz-dev

RUN <<EOF
set -o errexit
set -o nounset
set -o pipefail

mkdir -p /usr/local/src/git
cd /usr/local/src/git
git clone https://github.com/MayamaTakeshi/sngrep
cd sngrep/
git checkout mrcp_support
./bootstrap.sh
./configure --enable-unicode --with-pcre
make

ln -s `pwd`/src/sngrep /usr/local/bin/sngrep2

EOF

# install mariadb
RUN <<EOF
set -o errexit
set -o nounset
set -o pipefail

apt install -y mariadb-server

/etc/init.d/mariadb start

mysql -e "use mysql; ALTER USER 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('brastel')"
EOF

# build and install opensips
RUN <<EOF
set -o nounset 
set -o errexit
set -o pipefail

apt install -y lua5.1 expect libmariadb-dev-compat libxml2-dev libcurl4-openssl-dev libsqlite3-dev libmnl-dev libjson-c-dev libsnmp-dev

apt-get update && apt-get install -y \
  build-essential \
  bison \
  flex \
  cmake \
  git \
  libmnl-dev \
  libxml2-dev \
  libcurl4-openssl-dev \
  libpq-dev \
  unixodbc-dev \
  libdb-dev \
  libsqlite3-dev \
  libfreeradius-dev \
  libjwt-dev \
  libmaxminddb-dev \
  libldap2-dev \
  libjson-c-dev \
  libmemcached-dev \
  libhiredis-dev \
  libconfuse-dev \
  librabbitmq-dev \
  libssl-dev \
  liblua5.3-dev \
  libxmlrpc-core-c3-dev \
  libsctp-dev \
  libjansson-dev \
  librdkafka-dev \
  libgtp-dev \
  libwolfssl-dev \
  libpython3-dev \
  libmongoc-dev \
  libsnmp-dev \
  python-dev \
  perl perl-base perl-modules libperl-dev libnet-ldap-perl libipc-shareable-perl \
  libmicrohttpd-dev \
  liblua5.1-0-dev \
  libosp-dev

mkdir -p /usr/local/src/git
cd /usr/local/src/git
git clone https://github.com/OpenSIPS/opensips opensips
cd opensips

git checkout 3.6.0

export exclude_modules="db_oracle osp cachedb_cassandra cachedb_couchbase cachedb_dynamodb sngtc aaa_radius aaa_diameter event_sqs http2d launch_darkly rtp.io tls_wolfssl"

make prefix=/usr/local all
make prefix=/usr/local install

EOF

# Create the user
RUN groupadd --gid $USER_GID $user_name \
    && useradd --uid $USER_UID --gid $USER_GID -m $user_name

RUN echo $user_name ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$user_name \
    && chmod 0440 /etc/sudoers.d/$user_name

RUN echo "wireshark-common wireshark-common/install-setuid boolean true" | debconf-set-selections
RUN apt-get -y update 
RUN apt install -y tshark

# Installing opensips-cli
RUN <<EOF
set -o nounset 
set -o errexit
set -o pipefail

apt -y install python3 python3-pip python3-dev gcc default-libmysqlclient-dev \
                 python3-mysqldb python3-sqlalchemy python3-sqlalchemy-utils \
                 python3-openssl

pip3 install mysqlclient
pip3 install SQLAlchemy==1.4.47

curl https://apt.opensips.org/opensips-org.gpg -o /usr/share/keyrings/opensips-org.gpg
echo "deb [signed-by=/usr/share/keyrings/opensips-org.gpg] https://apt.opensips.org bullseye cli-nightly" >/etc/apt/sources.list.d/opensips-cli.list

apt -y update
apt -y install opensips-cli

EOF

# Creating database opensips"
RUN <<EOF
set -o nounset 
set -o errexit
set -o pipefail

echo "Creating database"

/etc/init.d/mariadb restart

(cat | expect -) <<'END'
exp_internal 1
set timeout 10
spawn opensips-cli -d -x database create
expect {
        timeout {exit 1}
	"Password for admin MySQL user (root): "
}
send "brastel\n"
expect eof
END

echo "Creating user opensips"
useradd -M opensips

EOF

USER $user_name

RUN echo "set-option -g default-shell /bin/bash" >> ~/.tmux.conf

ENV TERM=xterm

RUN git config --global user.email $git_user_email
RUN git config --global user.name $git_user_name

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash && echo "nvm installation OK"

RUN . ~/.nvm/nvm.sh && nvm install v21.7.0

RUN . ~/.nvm/nvm.sh && npm install -g yarn

RUN mkdir -p ~/.vim/autoload ~/.vim/bundle && curl -LSso ~/.vim/autoload/pathogen.vim https://tpo.pe/pathogen.vim

RUN <<EOF cat > ~/.vimrc
set tabstop=4       " The width of a TAB is set to 4.
                    " Still it is a \t. It is just that
                    " Vim will interpret it to be having
                    " a width of 4.

set shiftwidth=4    " Indents will have a width of 4

set softtabstop=4   " Sets the number of columns for a TAB

set expandtab       " Expand TABs to spaces

execute pathogen#infect()
syntax on
filetype plugin indent on

set background=dark
colorscheme zenburn
EOF


RUN <<EOF
set -o errexit
set -o nounset
set -o pipefail

# install vim zenburn color theme
mkdir -p ~/.vim/colors/
cd ~/.vim/colors/
wget https://raw.githubusercontent.com/jnurmine/Zenburn/de2fa06a93fe1494638ec7b2fdd565898be25de6/colors/zenburn.vim
EOF

RUN <<EOF cat >> ~/.bashrc
export LANG=C.UTF-8
export PS1='\u@\h:\W\$ '
export TZ=Asia/Tokyo
export TERM=xterm-256color
. ~/.nvm/nvm.sh
EOF

RUN sudo mkdir -p /run/opensips
