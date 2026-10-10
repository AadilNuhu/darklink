from django.db import models



# Create your models here.

class AppUser(models.Model):
    username= models.CharField(max_length=25,unique=True)
    ROLES = [
        ("A","Admin"),
        ("U", "User"),
    ]
    
    role = models.CharField(max_length=1,choices=ROLES,default="U")
    room=models.ForeignKey('chat_app.Room',related_name='members',on_delete=models.CASCADE,null=True,blank=True)
    
    def __str__(self):
        return self.username