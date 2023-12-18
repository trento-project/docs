### Install rabbitmq

```bash
zypper install rabbitmq-server
```

Enable and start the rabbitmq service:

```bash
systemctl enable --now rabbitmq-server
```

As the agent will need to be able to reach rabbitmq, allow connections from external hosts. Modify `/etc/rabbitmq/rabbitmq.conf` and ensure the following lines are present:

```bash
listeners.tcp.default = 5672
management.tcp.ip = 0.0.0.0
```

In addition to this, we need to allow the port to be accessible from external hosts. Add an exception on firewalld:

```bash
firewall-cmd --zone=public --add-port=5432/tcp --permanent
firewall-cmd --reload
```

#### Configure rabbitmq

#### Create rabbitmq user

```bash
rabbitmqctl add_user rabbitmq_user rabbitmq_user_password
```

#### Set admin role for new user

```bash
rabbitmqctl set_user_tags rabbitmq_user administrator
```

#### Verify the User's New Role

```bash
rabbitmqctl rabbitmqctl list_users
```

#### Create a virtual host

```bash
rabbitmqctl add_vhost vhost
```

# Set permissions for the user on the virtual host

```bash
rabbitmqctl set_permissions -p vhost rabbitmq_user ".*" ".*" ".*"
```

#### Optional: Enable rabbitmq management console

To be able to access the rabbitmq management console, the relevant plugin needs to be enabled:

```bash
rabbitmq-plugins enable rabbitmq_management
```

If you are logging in from an external host, allow connections from external hosts.

#### Set permissions for user to acess the managment ui

```bash
rabbitmqctl set_user_tags rabbitmq_user management administrator management
```

#### Verify the User's New Role

```bash
rabbitmqctl rabbitmqctl list_users
```

Modify `/etc/rabbitmq/rabbitmq.conf` add the follow line:

```bash

management.tcp.port = 15672

```

If you are connecting from an external host, add an exception on firewalld:

```bash
firewall-cmd --zone=public --add-port=15672/tcp --permanent
firewall-cmd --reload
```

#### Access the rabbitmqctl management and login with your newly created user

```bash
http://««IP»»:15672
```
