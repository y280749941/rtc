from __future__ import unicode_literals
from django.utils import timezone
from django.db import models

# Create your models here.
class Visitor(models.Model):
	ipAddr = models.GenericIPAddressField(default="127.0.0.1")
	timeVisited = models.DateTimeField(default=timezone.now)
	def __str__ (self):
		return self.ipAddr