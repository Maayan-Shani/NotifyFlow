package com.example.notifyflowlibrary.model

class MessageVariant {

    var id: String? = null
    var name: String? = null // A / B
    var title: String? = null
    var body: String? = null
    var buttonText: String? = null

    override fun toString(): String {
        return "MessageVariant(id=$id, name=$name, title=$title, body=$body, buttonText=$buttonText)"
    }
}