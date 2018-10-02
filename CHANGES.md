# ...

* Support multiple mongodb databases usage based on entity canon zone. Using a default DB when no zone are available in entity canon.
* Workaround the duplicate key issue of mongo in saving with upsert by automatically retry save (see https://jira.mongodb.org/browse/SERVER-14322)
* Support hint$ in query to help mongo to select the best index to use. 

# 1.4.0

# 1.1.0 - 27.08.2016

* Added Seneca 3 and Node 6 support
* Dropped Node 0.10, 0.12, 5 support
* Updated dependencies

# 1.0.0 - 08.08.2016

* Updated mongodb to 2.2.5
* Updated dependencies
* Options 2.0 style, connect URI support
* Ehanced error reporting
* Ehanced tests
